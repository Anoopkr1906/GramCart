import prisma from "@/lib/prisma";
import { getAuth } from "@clerk/nextjs/server";
import { PaymentMethod } from "@prisma/client";
import { NextResponse } from "next/server";



// create new order using cash on delivery only
export async function POST(request) {

    try {
        const {userId , has} = getAuth(request);
        if(!userId){
            return NextResponse.json({error: "not authorized"} , {status: 401});
        }

        const {addressId , items , couponCode , paymentMethod} = await request.json();

        // check if all required fields are present
        if(!addressId || !items || !Array.isArray(items) || items.length === 0 || !paymentMethod){
            return NextResponse.json({error: "missing required fields"} , {status: 401});
        }

        let coupon = null;
        if(couponCode){
            coupon = await prisma.coupon.findUnique({
                where: {code: couponCode.toUpperCase()}
                
            })

            if(!coupon){
                return NextResponse.json({error: "coupon not found"} , {status: 404});
            }
        }

        // if coupon is for new user only , check if user is new
        if(couponCode && coupon.forNewUser){
            const userOrders = await prisma.order.findMany({
                where: {userId}
            })

            if(userOrders.length > 0){
                return NextResponse.json({error: "coupon not valid for existing users"} , {status: 404});
            }
        }
        
        // if coupon is for members only , check if user has plus plan
        const isPlusMember = has({ plan: 'plus' });

        if(couponCode && coupon.forMember){  
            if(!isPlusMember){
                return NextResponse.json({error: "coupon valid for members only"} , {status: 400});
            }
        }

        // group orders by storeId using a map

        const ordersByStore = new Map();
        for(const item of items){
            const product = await prisma.product.findUnique({
                where: {id: item.id}
            })

            const storeId = product.storeId;

            if(!ordersByStore.has(storeId)){
                ordersByStore.set(storeId , []);
            }

            ordersByStore.get(storeId).push({...item , price: product.price});
        } 

        let orderIds = [];
        let fullAmount = 0 ;
        let shippingFeeAdded = false;

        // create orders for each seller

        for(const [storeId , sellerItems] of ordersByStore.entries()){
            let total = sellerItems.reduce((acc , item) => acc + item.price * item.quantity , 0);

            if(couponCode){
                total -= (total * coupon.discount)/100;
            }

            if(!isPlusMember && !shippingFeeAdded){
                total += 5; // add shipping fee
                shippingFeeAdded = true;
            }

            fullAmount += parseFloat(total.toFixed(2));

            const order = await prisma.order.create({
                data: {
                    userId,
                    storeId,
                    addressId,
                    total: parseFloat(total.toFixed(2)),
                    paymentMethod,
                    isCouponUsed: coupon ? true : false,
                    coupon: coupon ? coupon : {},
                    orderItems: {
                        create: sellerItems.map((item) => ({
                            productId: item.id,
                            quantity: item.quantity,
                            price: item.price
                        }))
                    }
                }
            })

            orderIds.push(order.id);
        }

        // clear the cart after placing order
        await prisma.user.update({
            where: {id: userId},
            data: {cart: {}}
        })

        return NextResponse.json({message: "order placed successfully"});

    } catch (error) {
        console.error(error);
        return NextResponse.json({error: error.code || error.message}, {status: 400});
    }
}


// get all orders for a user
export async function GET(request){
    try {
        const {userId} = getAuth(request);
        const orders = await prisma.order.findMany({
            where: {userId , OR: [
                {paymentMethod: PaymentMethod.COD},
                {AND: [{paymentMethod : PaymentMethod.STRIPE} , {isPaid: true}]}
            ]},
            include: {orderItems: {include: {product: true}}, address: true},

            orderBy: {createdAt: "desc"}
        })

        return NextResponse.json({orders});

    } catch (error) {
        console.error(error);
        return NextResponse.json({error: error.message}, {status: 400});
    }
}
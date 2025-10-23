import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

// get store info and store products

export async function GET(request) {
    try {
        // get store username from url search / query params
        const {searchParams} = new URL(request.url);
        const username = searchParams.get("username").toLowerCase();

        if(!username){
            return NextResponse.json({error: "missing username"}, {status: 400});
        }
        // get store info and instock products with ratings

        const store = await prisma.store.findUnique({
            where: {username , isActive: true},
            include: { Product: {include: {ratings: true}}}
        })

        if(!store){
            return NextResponse.json({error: "store not found"}, {status: 404});
        }

        return NextResponse.json({store}, {status: 200});
    } catch (error) {
        console.error(error);
        return NextResponse.json({error: error.code || error.message}, {status: 500});
    }
}

